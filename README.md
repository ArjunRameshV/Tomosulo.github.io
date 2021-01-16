# Tomasulo's Alogorithm 

### Intorduction

An important concpet in computer architecture, mainly concerned with <em> __dynamic scheduling__ </em> of instructions, also known as <em>__out of order execution__</em>, allowing on to utilize multiple execution units efficiently. In order to better understand the problem Tomasulo's Alogorithm solves, we need to get an idea of the register setup. 


Consider an in order execution strategy, where one might have a set of instructions I {i<sub>1</sub>, i<sub>2</sub>, ..., i<sub>n</sub>} that needs to be executed in the same order. 


This model is made in vanilla javascript and is a 16-bit unit. 

Currently it is assumed that cache miss does not happen, as it is just another waiting period the simulation. 

It is still in the initial build stage and does not really have all the exceptions handled. (Will soon be updated)